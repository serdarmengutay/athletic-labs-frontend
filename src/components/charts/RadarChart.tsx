"use client";

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RadarChartProps {
  categories: string[];
  athleteValues: number[];
  ageGroupAverage: number[];
}

export default function RadarChart({
  categories,
  athleteValues,
  ageGroupAverage,
}: RadarChartProps) {
  const data = categories.map((category, index) => ({
    category,
    athlete: athleteValues[index],
    ageGroup: ageGroupAverage[index],
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsRadar data={data}>
        <PolarGrid stroke="#1e293b" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "#64748b" }}
        />
        <Radar
          name="Sporcu"
          dataKey="athlete"
          stroke="#00ff88"
          fill="#00ff88"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Radar
          name="Yaş Grubu Ort."
          dataKey="ageGroup"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Legend
          wrapperStyle={{ paddingTop: "20px" }}
          iconType="circle"
          formatter={(value) => (
            <span style={{ color: "#cbd5e1", fontSize: "14px" }}>{value}</span>
          )}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
