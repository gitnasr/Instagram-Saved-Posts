import { NextResponse } from "next/server";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import {
  getProfileVectorStats,
  getAllProfilesVectorStats,
} from "@/lib/vector/stats";
import {
  COLLECTIONS,
  countCollectionPoints,
  getQdrantDashboardUrl,
  isQdrantConfigured,
  getQdrantConfig,
} from "@/lib/vector/qdrant-client";

export async function GET() {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const isConfigured = isQdrantConfigured(getQdrantConfig());

  const [activeProfileStats, allProfilesStats, imagesPoints, facesPoints] = await Promise.all([
    getProfileVectorStats(profile.id),
    getAllProfilesVectorStats(),
    isConfigured ? countCollectionPoints(COLLECTIONS.POST_IMAGES, profile.id) : 0,
    isConfigured ? countCollectionPoints(COLLECTIONS.POST_FACES, profile.id) : 0,
  ]);

  return NextResponse.json({
    activeProfile: activeProfileStats,
    allProfiles: allProfilesStats,
    totalProfilesIndexed: allProfilesStats.filter((p) => p.indexedItems > 0).length,
    qdrant: {
      configured: isConfigured,
      dashboardUrl: getQdrantDashboardUrl(),
      profilePoints: {
        images: imagesPoints,
        faces: facesPoints,
        total: imagesPoints + facesPoints,
      },
    },
  });
}
