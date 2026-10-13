import type { MetadataRoute } from "next";

// Only the public pages should appear in search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy"],
      disallow: ["/api/", "/auth/", "/dashboard", "/upload", "/syllabi/", "/courses/", "/settings", "/goodbye"],
    },
  };
}
