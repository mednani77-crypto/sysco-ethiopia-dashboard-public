import React from "react";
import { Panel } from "./ui";
import type { Period } from "./model";
export function useClearing(_enabled: boolean, _capturedAt: string | undefined, _to: string) { return {data: null, error: "", retry: () => {}}; }
type Resource = ReturnType<typeof useClearing>;
export function ClearingHome({resource: _r, onOpen}: {resource: Resource; onOpen: () => void}) { return <Panel title="Clearing demo"><p>Private receipt evidence is excluded.</p><button onClick={onOpen}>Details</button></Panel>; }
export function ClearingView({resource: _r, p: _p}: {resource: Resource; p: Period}) { return <Panel title="Clearing demo"><p>No receipts or real clearing records are distributed with this public demo.</p></Panel>; }
