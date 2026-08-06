import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const triggerDistance = 78;
const maximumDistance = 112;

export function PullToRefresh() {
  const queryClient = useQueryClient();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const pulling = useRef(false);
  const currentDistance = useRef(0);

  useEffect(() => {
    const reset = () => {
      pulling.current = false;
      currentDistance.current = 0;
      setDistance(0);
    };
    const onTouchStart = (event: TouchEvent) => {
      if (refreshing || window.scrollY > 0 || event.touches.length !== 1) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [data-no-pull-refresh]")) return;
      start.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      pulling.current = true;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!pulling.current || event.touches.length !== 1) return;
      const deltaY = event.touches[0].clientY - start.current.y;
      const deltaX = Math.abs(event.touches[0].clientX - start.current.x);
      if (deltaY <= 0 || deltaX > deltaY || window.scrollY > 0) {
        reset();
        return;
      }
      event.preventDefault();
      const resistedDistance = Math.min(maximumDistance, deltaY * 0.48);
      currentDistance.current = resistedDistance;
      setDistance(resistedDistance);
    };
    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (currentDistance.current < triggerDistance) {
        reset();
        return;
      }
      setRefreshing(true);
      setDistance(triggerDistance);
      window.dispatchEvent(new Event("savoury-orders-updated"));
      await Promise.all([
        queryClient.invalidateQueries({ type: "active" }),
        new Promise((resolve) => window.setTimeout(resolve, 650)),
      ]);
      setRefreshing(false);
      reset();
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", reset);
    };
  }, [queryClient, refreshing]);

  const visible = distance > 0 || refreshing;
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-2 z-[120] -translate-x-1/2 transition-opacity duration-150"
      style={{ opacity: visible ? 1 : 0, transform: `translate(-50%, ${Math.max(-68, distance - 68)}px)` }}
      role="status"
      aria-label={refreshing ? "Refreshing page data" : distance >= triggerDistance ? "Release to refresh" : "Pulling to refresh"}
    >
      <span className={`grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 bg-white shadow-premium dark:bg-zinc-900 ${distance >= triggerDistance ? "border-savoury-secondary" : "border-savoury-primary/40"} ${refreshing ? "savoury-loader-logo" : ""}`}>
        <img src="/images/savoury-logo-tight.jpeg" alt="" className="h-full w-full scale-[1.2] object-cover object-center" />
      </span>
    </div>
  );
}
