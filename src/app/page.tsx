import { Suspense } from "react";

import { ContentHubDashboard } from "@/components/content-hub-dashboard";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <ContentHubDashboard />
    </Suspense>
  );
}
