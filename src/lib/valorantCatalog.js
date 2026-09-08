const MAP_POOL = ["Ascent", "Abyss", "Bind", "Breeze", "Corrode", "Fracture", "Haven", "Icebox", "Lotus", "Pearl", "Split", "Summit", "Sunset"];
const CACHE_KEY = "draftix:catalog:v6";
const CACHE_TTL = 12 * 60 * 60 * 1000;

function readCache() {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return value?.catalog?.maps?.length > 1 && value?.catalog?.agents?.length > 1 ? value : null;
  } catch { return null; }
}

export async function getValorantCatalog() {
  const cached = readCache();
  if (cached && Date.now() - cached.savedAt < CACHE_TTL) return cached.catalog;
  try {
    const [agentsResponse, mapsResponse, versionResponse] = await Promise.all([
      fetch("/data/valorant-agents.json"),
      fetch("https://valorant-api.com/v1/maps?language=en-US"),
      fetch("https://valorant-api.com/v1/version").catch(() => null),
    ]);
    if (!agentsResponse.ok || !mapsResponse.ok) throw new Error("Valorant catalog request failed");
    const [agentsJson, mapsJson, versionJson] = await Promise.all([
      agentsResponse.json(),
      mapsResponse.json(),
      versionResponse?.ok ? versionResponse.json().catch(() => null) : null,
    ]);
    const agentRows = Array.isArray(agentsJson) ? agentsJson : agentsJson.data || [];
    const agents = agentRows
      .filter((agent) => agent.uuid && (agent.name || agent.displayName) && (agent.image || agent.fullPortrait))
      .map((agent) => ({
        uuid: agent.uuid,
        name: agent.name || agent.displayName,
        description: agent.description || "",
        image: agent.image || agent.fullPortrait,
        icon: agent.icon || agent.displayIcon || agent.image || agent.fullPortrait,
        background: agent.background || null,
        colors: agent.colors || agent.backgroundGradientColors || [],
        role: agent.role || null,
        abilities: agent.abilities || [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const maps = (mapsJson.data || [])
      .filter((map) => MAP_POOL.includes(map.displayName))
      .map((map) => ({ uuid: map.uuid, name: map.displayName, image: `/images/maps/${map.displayName.toLowerCase()}.webp` }))
      .sort((a, b) => MAP_POOL.indexOf(a.name) - MAP_POOL.indexOf(b.name));
    if (maps.length < 2 || agents.length < 2) throw new Error("Valorant catalog is incomplete");
    const patch = versionJson?.data?.version || versionJson?.data?.buildVersion || "unknown";
    const catalog = { maps, agents, patch };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), catalog })); } catch { }
    return catalog;
  } catch (error) {
    if (cached) return cached.catalog;
    throw error;
  }
}
