"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type StoreRegionContext = {
  region: string;
  storeId: string;
  storeLabel: string;
};

const regions = [
  "Region A",
  "Region B",
  "Region C",
  "Region D",
  "Region E",
  "Region F",
  "Region G",
];

export function StoreRegionPicker({
  onContextChange,
}: {
  onContextChange?: (ctx: StoreRegionContext) => void;
}) {
  const [region, setRegion] = useState<string>("Region C");
  const [storeId, setStoreId] = useState<string>("1");

  const storeLabel = `Store ${storeId}`;

  const ctx: StoreRegionContext = { region, storeId, storeLabel };

  useEffect(() => {
    onContextChange?.(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, storeId]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Region and store are UI context only; OrbitDB inventory is not scoped by location yet.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="region">Region</Label>
        <select
          id="region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="storeId">Store</Label>
        <Input
          id="storeId"
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          placeholder="1"
          inputMode="numeric"
        />
      </div>
    </div>
  );
}

