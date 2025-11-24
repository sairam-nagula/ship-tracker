"use client";

import { useJsApiLoader } from "@react-google-maps/api";

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;

export function useGoogleMapsLoader() {
  return useJsApiLoader({
    id: "google-map-script", // <- consistent ID everywhere
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
    mapIds: MAP_ID ? [MAP_ID] : undefined,
    libraries: [], // keep this the SAME everywhere; adjust if you ever add libs
  });
}
