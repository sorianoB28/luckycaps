const pools: Record<string, string[]> = {
  Snapbacks: [
    "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "https://images.unsplash.com/photo-1678099281876-469facab942a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OTF8fHNuYXBiYWNrJTIwaGF0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1691256676359-20e5c6d4bc92?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fHNuYXBiYWNrJTIwaGF0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1728925962995-c5a11993564a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8c25hcGJhY2slMjBoYXR8ZW58MHx8MHx8fDA%3D",
  ],
  Fitted: [
    "https://images.unsplash.com/photo-1610749359341-65c96bf609d5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8Zml0dGVkJTIwaGF0JTIwc2luZ2xlfGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1596760029995-7574f97381bf?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGZpdHRlZCUyMGhhdCUyMHNpbmdsZXxlbnwwfHwwfHx8MA%3D%3D",
    "https://plus.unsplash.com/premium_photo-1707928726845-36ce130670b7?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Zml0dGVkJTIwaGF0JTIwc2luZ2xlfGVufDB8fDB8fHww",
  ],
  Trucker: [
    "https://images.unsplash.com/photo-1620327467532-6ebaca6273ed?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8dHJ1Y2tlciUyMGhhdHxlbnwwfHwwfHx8MA%3D%3D",
    "https://images.unsplash.com/photo-1753723824025-50ba4bc2ab68?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHRydWNrZXIlMjBoYXR8ZW58MHx8MHx8fDA%3D",
    "https://plus.unsplash.com/premium_photo-1755456918232-2466436b985a?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTE0fHx0cnVja2VyJTIwaGF0fGVufDB8fDB8fHww",
  ],
  Beanies: [
    "https://images.unsplash.com/photo-1630691650107-53dd500d2907?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8YmVhbmllJTIwaGF0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1633964124833-f4f3928c55bb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmVhbmllJTIwaGF0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1618354691792-d1d42acfd860?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8YmVhbmllJTIwaGF0fGVufDB8fDB8fHww",
    "https://plus.unsplash.com/premium_photo-1695603437311-fec2f916a0f5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGJlYW5pZSUyMGhhdHxlbnwwfHwwfHx8MA%3D%3D",
    "https://images.unsplash.com/photo-1664289321749-07316ab5e374?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fGJlYW5pZSUyMGhhdHxlbnwwfHwwfHx8MA%3D%3D",
  ],
  Custom: [
    "https://plus.unsplash.com/premium_photo-1695908424844-704917f40be0?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y3VzdG9tJTIwaGF0fGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1647528458336-c0eb575af956?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8Y3VzdG9tJTIwaGF0JTIwb25seXxlbnwwfHwwfHx8MA%3D%3D",
    "https://images.unsplash.com/photo-1663280426574-00126d048f71?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8Y3VzdG9tJTIwaGF0JTIwb25seXxlbnwwfHwwfHx8MA%3D%3D",
  ],
  General: [
    "https://images.unsplash.com/photo-1633965285859-bf8c8a63fcbe?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8aGF0JTIwbW9kZWx8ZW58MHx8MHx8fDA%3D",
    "https://plus.unsplash.com/premium_photo-1765304738986-a3302013c4d8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTN8fGhhdCUyMG1vZGVsfGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1633677263781-610f76009206?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGhhdCUyMG1vZGVsfGVufDB8fDB8fHww",
    "https://images.unsplash.com/photo-1643308002690-4d7735999545?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8aGF0JTIwbW9kZWwlMjBtZW58ZW58MHx8MHx8fDA%3D",
  ],
};

const normalizeCategory = (category: string) => {
  const key = category.toLowerCase();
  if (key.includes("snapback") || key.includes("snap")) return "Snapbacks";
  if (key.includes("fitted") || key.includes("fit")) return "Fitted";
  if (key.includes("truck")) return "Trucker";
  if (key.includes("beanie") || key.includes("bean")) return "Beanies";
  if (key.includes("custom")) return "Custom";
  return "General";
};

const hashString = (value: string) =>
  Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);

export function getPlaceholderImages(
  category: string,
  slug: string,
  count = 3
): string[] {
  const poolKey = normalizeCategory(category);
  const pool = pools[poolKey] ?? pools.General;
  const base = hashString(slug || category || "product");
  const images: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = (base + i * 7) % pool.length;
    images.push(pool[idx]);
  }
  return images;
}
