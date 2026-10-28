"use client";

import React from 'react';
import * as Recharts from 'recharts';

type Props = { data: any };

const COLORS = ['#60A5FA', '#F97316', '#10B981', '#A78BFA'];

export default function PieGoalChart({ data }: Props) {
  return (
    <Recharts.ResponsiveContainer width="100%" height={200}>
      <Recharts.PieChart>
        <Recharts.Pie data={data} dataKey="value" nameKey="name" outerRadius={70} fill="#8884d8">
          {data.map((entry: any, index: number) => (
            <Recharts.Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Recharts.Pie>
        <Recharts.Tooltip formatter={(value: unknown) => `₹${(Number(value) || 0).toLocaleString('en-IN')}`} />
        <Recharts.Legend verticalAlign="bottom" wrapperStyle={{ color: '#94A3B8' }} />
      </Recharts.PieChart>
    </Recharts.ResponsiveContainer>
  );
}
