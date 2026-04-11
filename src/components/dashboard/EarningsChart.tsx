import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type EarningsChartProps = {
  data: Array<{ month: string; earnings: number }>;
};

const EarningsChart = ({ data }: EarningsChartProps) => {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(43, 64%, 65%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(43, 64%, 65%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 90%)" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(222, 30%, 45%)" />
          <YAxis tick={{ fontSize: 12 }} stroke="hsl(222, 30%, 45%)" />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(221, 83%, 14%)",
              border: "1px solid hsl(43, 64%, 65%, 0.3)",
              borderRadius: "12px",
              fontSize: "12px",
              color: "white",
            }}
            formatter={(value: number) => [`₹${value.toLocaleString("en-IN")}`, "Earnings"]}
          />
          <Area type="monotone" dataKey="earnings" stroke="hsl(43, 64%, 65%)" strokeWidth={2} fill="url(#earningsGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EarningsChart;
