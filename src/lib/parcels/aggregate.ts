import { formatAreaSqmLabel } from "@/lib/parcels/format";
import type { ParcelItem, ParcelReviewSummary, ParcelSnapshot } from "@/types/parcelReview";

export function sumParcelAreas(parcels: ParcelItem[]): number {
  return parcels.reduce((sum, parcel) => sum + (parcel.areaSqm > 0 ? parcel.areaSqm : 0), 0);
}

export function buildParcelReviewSummary(parcels: ParcelItem[]): ParcelReviewSummary {
  const totalAreaSqm = sumParcelAreas(parcels);
  return {
    parcels,
    parcelCount: parcels.length,
    totalAreaSqm,
    totalAreaLabel: totalAreaSqm > 0 ? formatAreaSqmLabel(totalAreaSqm) : "확인 필요",
  };
}

export function parcelToSnapshot(parcel: ParcelItem): ParcelSnapshot {
  return {
    jibunAddress: parcel.jibunAddress,
    address: parcel.address,
    pnu: parcel.pnu,
    areaLabel: parcel.areaLabel,
    areaSqm: parcel.areaSqm,
    landCategory: parcel.landCategory,
    isPrimary: parcel.isPrimary,
  };
}

export function snapshotsToSummary(snapshots: ParcelSnapshot[]): ParcelReviewSummary {
  const parcels: ParcelItem[] = snapshots.map((snapshot, index) => ({
    id: snapshot.pnu || `snapshot-${index}`,
    address: snapshot.address,
    jibunAddress: snapshot.jibunAddress,
    pnu: snapshot.pnu,
    lat: 0,
    lng: 0,
    areaSqm: snapshot.areaSqm,
    areaLabel: snapshot.areaLabel,
    landCategory: snapshot.landCategory,
    zoning: "",
    isPrimary: snapshot.isPrimary,
  }));
  return buildParcelReviewSummary(parcels);
}
