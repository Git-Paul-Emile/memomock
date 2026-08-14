import data from "../../../../../data.json";
import { NextResponse, type NextRequest } from "next/server";

type ResourceStore = Record<string, Array<Record<string, any>>>;

const globalStore = globalThis as typeof globalThis & { __memoAiMockStore?: ResourceStore };

function cloneData(): ResourceStore {
  return JSON.parse(JSON.stringify(data)) as ResourceStore;
}

function getStore(): ResourceStore {
  globalStore.__memoAiMockStore ??= cloneData();
  return globalStore.__memoAiMockStore;
}

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers });
}

function getPathParts(path?: string[]) {
  return path?.filter(Boolean) ?? [];
}

function getCollection(resource: string) {
  const collection = getStore()[resource];
  return Array.isArray(collection) ? collection : null;
}

function matchesQuery(item: Record<string, any>, searchParams: URLSearchParams) {
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("_") || key === "q") continue;
    if (String(item[key]) !== value) return false;
  }
  return true;
}

function applyQuery(collection: Array<Record<string, any>>, searchParams: URLSearchParams) {
  let rows = collection.filter((item) => matchesQuery(item, searchParams));
  const search = searchParams.get("q")?.trim().toLowerCase();
  if (search) {
    rows = rows.filter((item) => JSON.stringify(item).toLowerCase().includes(search));
  }

  const sortKey = searchParams.get("_sort");
  if (sortKey) {
    const order = searchParams.get("_order") === "desc" ? -1 : 1;
    rows = [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      if (left === right) return 0;
      return left > right ? order : -order;
    });
  }

  const total = rows.length;
  const page = Number(searchParams.get("_page"));
  const limit = Number(searchParams.get("_limit"));
  if (Number.isFinite(page) && page > 0 && Number.isFinite(limit) && limit > 0) {
    const start = (page - 1) * limit;
    rows = rows.slice(start, start + limit);
  }

  return { rows, total };
}

function nextId(resource: string) {
  const collection = getCollection(resource) ?? [];
  return `${resource}-${Date.now()}-${collection.length + 1}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const [resource, id, action] = getPathParts(path);
  if (!resource) return json(getStore());

  if (resource === "users" && id === "me" && action === "sessions") {
    return json([]);
  }

  const collection = getCollection(resource);
  if (!collection) return json({ message: "Ressource introuvable." }, 404);

  if (id) {
    const item = collection.find((entry) => String(entry.id) === id);
    return item ? json(item) : json({ message: "Element introuvable." }, 404);
  }

  const { rows, total } = applyQuery(collection, request.nextUrl.searchParams);
  return json(rows, 200, { "X-Total-Count": String(total) });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const [resource, id, action] = getPathParts(path);

  if (resource === "public" || action === "anonymiser" || action === "revoquer-sessions") {
    return json({ ok: true, id: nextId(resource ?? "mock") }, 201);
  }

  if (resource === "documents" && id && action === "relancer-analyse") {
    return json({ ok: true });
  }

  const collection = resource ? getCollection(resource) : null;
  if (!resource || !collection) return json({ message: "Ressource introuvable." }, 404);

  const body = await request.json().catch(() => ({}));
  const created = {
    id: body.id ?? nextId(resource),
    createdAt: body.createdAt ?? new Date().toISOString(),
    ...body,
  };
  collection.push(created);
  return json(created, 201);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const [resource, id] = getPathParts(path);
  const collection = resource ? getCollection(resource) : null;
  if (!resource || !id || !collection) return json({ message: "Ressource introuvable." }, 404);

  const index = collection.findIndex((entry) => String(entry.id) === id);
  if (index === -1) return json({ message: "Element introuvable." }, 404);

  const body = await request.json().catch(() => ({}));
  collection[index] = { ...collection[index], ...body };
  return json(collection[index]);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  return PATCH(request, context);
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await context.params;
  const [resource, id] = getPathParts(path);
  const collection = resource ? getCollection(resource) : null;
  if (!resource || !id || !collection) return json({ message: "Ressource introuvable." }, 404);

  const index = collection.findIndex((entry) => String(entry.id) === id);
  if (index === -1) return json({ message: "Element introuvable." }, 404);

  collection.splice(index, 1);
  return new NextResponse(null, { status: 204 });
}
