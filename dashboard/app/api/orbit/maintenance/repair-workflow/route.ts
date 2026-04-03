import type { NextRequest } from "next/server";

import { auth } from "@/auth";
import { getOrbitBaseUrl, orbitJson } from "@/lib/orbit-fetch";
import { getAccessToken, hasOrbitStaffDashboardRole } from "@/lib/orbit-session";

type Machine = {
	id: string;
	type: string;
	status: string;
	lastServiceDate: string;
};

type ConstraintMetadata = {
	warningMaxOperationalHours: number;
	maxTimeBetweenServiceDays: number;
	notes: string;
};

type RepairScheduleStop = {
	stop: number;
	machineId: string;
	plannedDate: string;
	travelTime: string;
	priority: "High" | "Medium" | "Low";
};

type OrbitMachine = {
	machineId?: number;
	name?: string;
	model?: string;
	status?: string;
	lastServiceDate?: string | null;
};

type MachinesPayload = {
	data?: OrbitMachine[];
};

function normalizeStatus(status?: string): string {
	const value = String(status ?? "").toLowerCase();
	if (value === "operational") return "normal";
	return value || "normal";
}

function dateOffsetIso(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
	const region = req.nextUrl.searchParams.get("region") ?? "Region C";
	const storeId = req.nextUrl.searchParams.get("storeId") ?? "1";

	const session = await auth();
	const token = getAccessToken(session);
	if (!token) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (!hasOrbitStaffDashboardRole(session)) {
		return Response.json({ error: "Forbidden" }, { status: 403 });
	}
	if (!getOrbitBaseUrl()) {
		return Response.json({ error: "ORBITDB_API_URL is not configured" }, { status: 503 });
	}

	let machinesResult = await orbitJson<MachinesPayload>(
		token,
		`/maintenance/machines?storeId=${encodeURIComponent(storeId)}&limit=50`,
		{ method: "GET" }
	);

	if (!machinesResult.ok && machinesResult.status === 403) {
		machinesResult = await orbitJson<MachinesPayload>(token, "/maintenance/assignments/me?limit=50", {
			method: "GET",
		});
	}

	if (!machinesResult.ok) {
		return new Response(machinesResult.body, { status: machinesResult.status });
	}

	const machines: Machine[] = (machinesResult.data.data ?? []).map((machine) => {
		const idNumber = machine.machineId ?? 0;
		const normalized = normalizeStatus(machine.status);
		return {
			id: `M-${idNumber}`,
			type: [machine.name, machine.model].filter(Boolean).join(" - ") || "Machine",
			status: normalized,
			lastServiceDate: (machine.lastServiceDate || new Date().toISOString()).slice(0, 10),
		};
	});

	const constraints: ConstraintMetadata = {
		warningMaxOperationalHours: 48,
		maxTimeBetweenServiceDays: 30,
		notes: "Derived from current maintenance workflow constraints in the backend.",
	};

	const prioritized = [...machines].sort((a, b) => {
		const score = (status: string): number => {
			if (status === "error" || status === "out-of-order") return 3;
			if (status === "warning") return 2;
			if (status === "schedule-service") return 1;
			return 0;
		};
		return score(b.status) - score(a.status);
	});

	const optimizedSchedule: RepairScheduleStop[] = prioritized.map((machine, index) => ({
		stop: index + 1,
		machineId: machine.id,
		plannedDate: dateOffsetIso(index),
		travelTime: `${Math.max(0, 30 - index * 3)}m`,
		priority:
			machine.status === "error" || machine.status === "out-of-order"
				? "High"
				: machine.status === "warning"
					? "Medium"
					: "Low",
	}));

	const statusTransitionOptions = [
		"normal",
		"warning",
		"repair-start",
		"repair-end",
		"error",
		"out-of-order",
		"schedule-service",
	];

	return Response.json({
		region,
		storeId,
		generatedAt: new Date().toISOString(),
		machines,
		constraints,
		optimizedSchedule,
		statusTransitionOptions,
		workflow: [
			{ step: "View Machines", done: machines.length > 0 },
			{ step: "Import CSV Repair Schedules", done: false },
			{ step: "Update Machine Statuses", done: true },
			{ step: "Generate Optimized Schedule", done: optimizedSchedule.length > 0 },
			{ step: "Apply Constraints", done: true },
			{ step: "Record Maintenance", done: false },
			{ step: "View Historical Records", done: true },
		],
	});
}
