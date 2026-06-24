"use client";

import { useCallback, useEffect, useRef } from "react";
import type { LeadRecord } from "@/types/lead";
import { LEAD_TYPE_LABELS, leadTypeToScore } from "@/types/lead";

function displayName(lead: LeadRecord): string {
  return lead.name?.trim() || lead.phone;
}

function formatCapacity(lead: LeadRecord): string {
  if (lead.estimatedCapacityKw != null && Number.isFinite(lead.estimatedCapacityKw)) {
    return `${lead.estimatedCapacityKw} kW`;
  }
  const fromContext = lead.analysisContext?.capacity?.trim();
  return fromContext || "";
}

export function buildLeadAlertMessage(lead: LeadRecord): string {
  const parts = [
    LEAD_TYPE_LABELS[lead.leadType],
    displayName(lead),
    lead.phone,
    lead.address,
  ];
  const capacity = formatCapacity(lead);
  if (capacity) parts.push(capacity);
  return parts.filter(Boolean).join(" · ");
}

export function showBrowserLeadNotification(lead: LeadRecord): void {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  const score = leadTypeToScore(lead.leadType);
  try {
    new Notification(`[${score}] NEW LEAD — ${LEAD_TYPE_LABELS[lead.leadType]}`, {
      body: buildLeadAlertMessage(lead),
      tag: `lead-${lead.id}`,
    });
  } catch {
    // Notification API may fail in unsupported contexts
  }
}

export function requestLeadNotificationPermission(): void {
  if (typeof window === "undefined" || typeof Notification === "undefined") return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

export function useLeadNotificationPermissionOnMount(): void {
  useEffect(() => {
    requestLeadNotificationPermission();
  }, []);
}

export function useLeadIdTracker() {
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isInitialRef = useRef(true);

  const detectNewLeads = useCallback((leads: LeadRecord[]): LeadRecord[] => {
    if (isInitialRef.current) {
      knownIdsRef.current = new Set(leads.map((lead) => lead.id));
      isInitialRef.current = false;
      return [];
    }

    const fresh = leads.filter((lead) => !knownIdsRef.current.has(lead.id));
    knownIdsRef.current = new Set(leads.map((lead) => lead.id));
    return fresh;
  }, []);

  const resetTracker = useCallback((leads: LeadRecord[]) => {
    knownIdsRef.current = new Set(leads.map((lead) => lead.id));
    isInitialRef.current = false;
  }, []);

  return { detectNewLeads, resetTracker };
}
