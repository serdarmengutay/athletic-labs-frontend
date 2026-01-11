"use client";

import {
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface BarChartData {
  label: string;
  athleteValue: number;
  ageGroupAverage: number;
  unit: string;
}

interface PerformanceBarChartProps {
  data: BarChartData[];
}

export default function PerformanceBarChart({
  data,
}: PerformanceBarChartProps) {
  const chartData = data.map((item) => ({
    name: item.label,
    Sporcu: item.athleteValue,
    "Yaş Grubu": item.ageGroupAverage,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBar data={chartData} barGap={8}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          angle={-15}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#e2e8f0",
          }}
          labelStyle={{ color: "#cbd5e1", fontWeight: "bold" }}
        />
        <Legend
          wrapperStyle={{ paddingTop: "10px" }}
          iconType="rect"
          formatter={(value) => (
            <span style={{ color: "#cbd5e1", fontSize: "14px" }}>{value}</span>
          )}
        />
        <Bar dataKey="Sporcu" fill="#00ff88" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Yaş Grubu" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </RechartsBar>
    </ResponsiveContainer>
  );
}
