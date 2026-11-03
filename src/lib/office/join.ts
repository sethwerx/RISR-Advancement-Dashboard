import type { JoinedPerson, MatchMethod, SourcePart } from "@/lib/office/types";

export function normalizePersonName(first: string, last: string): string {
  return `${first} ${last}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeStudentId(value: string | undefined): string | undefined {
  const digits = (value ?? "").replace(/\D/g, "");
  return /^\d{5}$/.test(digits) ? digits : undefined;
}

/** OA id is the number at the end of a Notion OA Profile URL, or the raw id. */
export function extractOaId(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const match = value.trim().match(/(\d+)\s*$/);
  return match ? match[1] : undefined;
}

type Cluster = {
  indexes: number[];
  methods: Set<MatchMethod>;
};

export function joinPeople(parts: SourcePart[]): JoinedPerson[] {
  const parent = parts.map((_, index) => index);
  const methods = parts.map(() => new Set<MatchMethod>());

  function find(index: number): number {
    while (parent[index] !== index) {
      parent[index] = parent[parent[index]];
      index = parent[index];
    }
    return index;
  }

  function unite(left: number, right: number, method: MatchMethod) {
    const a = find(left);
    const b = find(right);
    if (a === b) {
      methods[a].add(method);
      return;
    }
    parent[b] = a;
    for (const item of methods[b]) methods[a].add(item);
    methods[a].add(method);
  }

  const byOa = new Map<string, number>();
  const byStudent = new Map<string, number>();
  const byNameDob = new Map<string, number>();
  parts.forEach((part, index) => {
    const oaId = extractOaId(part.oaId);
    const studentId = normalizeStudentId(part.studentId);
    if (oaId) {
      const prior = byOa.get(oaId);
      if (prior == null) byOa.set(oaId, index);
      else unite(prior, index, "oa-id");
    }
    if (studentId) {
      const prior = byStudent.get(studentId);
      if (prior == null) byStudent.set(studentId, index);
      else unite(prior, index, "student-id");
    }
    if (part.dob && part.firstName && part.lastName) {
      const key = `${normalizePersonName(part.firstName, part.lastName)}|${part.dob}`;
      const prior = byNameDob.get(key);
      if (prior == null) byNameDob.set(key, index);
      else unite(prior, index, "name-dob");
    }
  });

  const byName = new Map<string, number[]>();
  parts.forEach((part, index) => {
    if (!part.firstName || !part.lastName) return;
    const key = normalizePersonName(part.firstName, part.lastName);
    const list = byName.get(key) ?? [];
    list.push(index);
    byName.set(key, list);
  });
  for (const indexes of byName.values()) {
    for (let i = 1; i < indexes.length; i += 1) {
      const left = indexes[0];
      const right = indexes[i];
      if (find(left) === find(right)) continue;
      if (conflicts(parts, findMembers(find, parent, left), findMembers(find, parent, right))) continue;
      const leftDob = parts[left].dob;
      const rightDob = parts[right].dob;
      if (leftDob && rightDob && leftDob !== rightDob) continue;
      if (leftDob && rightDob) continue;
      unite(left, right, "name-only");
    }
  }

  const groups = new Map<number, number[]>();
  parts.forEach((_, index) => {
    const root = find(index);
    const list = groups.get(root) ?? [];
    list.push(index);
    groups.set(root, list);
  });

  return [...groups.entries()].map(([root, indexes]) => mergeCluster(parts, indexes, methods[root]));
}

function findMembers(find: (index: number) => number, parent: number[], index: number): number[] {
  const root = find(index);
  const members: number[] = [];
  parent.forEach((_, item) => {
    if (find(item) === root) members.push(item);
  });
  return members;
}

function conflicts(parts: SourcePart[], left: number[], right: number[]): boolean {
  return conflicting(left, right, (index) => extractOaId(parts[index].oaId)) || conflicting(left, right, (index) => normalizeStudentId(parts[index].studentId));
}

function conflicting(left: number[], right: number[], read: (index: number) => string | undefined): boolean {
  const a = new Set(left.map(read).filter(Boolean));
  const b = new Set(right.map(read).filter(Boolean));
  if (a.size === 0 || b.size === 0) return false;
  for (const value of a) if (!b.has(value)) return true;
  return false;
}

function mergeCluster(parts: SourcePart[], indexes: number[], methods: Set<MatchMethod>): JoinedPerson {
  const first = parts[indexes[0]];
  const fields: Record<string, string> = {};
  const sources: string[] = [];
  let oaId: string | undefined;
  let studentId: string | undefined;
  let dob: string | undefined;
  let grade = "";
  let enrollmentYear: number | undefined;
  let firstName = "";
  let lastName = "";
  for (const index of indexes) {
    const part = parts[index];
    sources.push(part.source);
    oaId = oaId || extractOaId(part.oaId);
    studentId = studentId || normalizeStudentId(part.studentId);
    dob = dob || part.dob;
    grade = grade || part.grade || "";
    enrollmentYear = enrollmentYear ?? part.enrollmentYear;
    firstName = firstName || part.firstName;
    lastName = lastName || part.lastName;
    for (const [key, value] of Object.entries(part.fields)) {
      if (value && !fields[key]) fields[key] = value;
    }
  }
  const used = [...methods].filter((method) => method !== "single");
  const match: MatchMethod = used[0] ?? "single";
  const low = methods.has("name-only") && !methods.has("oa-id") && !methods.has("student-id") && !methods.has("name-dob");
  return {
    id: oaId ? `oa-${oaId}` : studentId ? `sid-${studentId}` : `name-${normalizePersonName(firstName, lastName) || first.source}`,
    oaId,
    studentId,
    firstName,
    lastName,
    dob,
    grade,
    enrollmentYear,
    fields,
    sources: [...new Set(sources)],
    match: low ? "name-only" : match,
    confidence: low ? "low" : "high",
  };
}
