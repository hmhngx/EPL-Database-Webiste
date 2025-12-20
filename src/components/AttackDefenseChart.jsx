import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AttackDefenseChart = ({ standings, selectedTeams }) => {
  const chartData = useMemo(() => {
    if (!standings || standings.length === 0) {
      return [];
    }

    // Filter teams based on selection
    const teamsToShow = selectedTeams.length > 0
      ? standings.filter(team => selectedTeams.includes(team.team_id))
      : standings;

    return teamsToShow.map((team, index) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      x: parseInt(team.gf || 0, 10), // Goals For (X-axis)
      y: parseInt(team.ga || 0, 10), // Goals Against (Y-axis)
      gd: parseInt(team.gd || 0, 10),
      pts: parseInt(team.pts || 0, 10),
      index,
    }));
  }, [standings, selectedTeams]);

  // Generate colors for teams
  const colors = [
    '#00FF85', '#04f5ff', '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
    '#F8B739', '#E74C3C', '#9B59B6', '#1ABC9C', '#3498DB',
    '#E67E22', '#95A5A6', '#34495E', '#16A085', '#27AE60'
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg shadow-lg p-3">
          <p className="font-bold text-gray-900 dark:text-white">{data.team_name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Goals For: <span className="font-semibold">{data.x}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Goals Against: <span className="font-semibold">{data.y}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Goal Difference: <span className="font-semibold">{data.gd > 0 ? '+' : ''}{data.gd}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Points: <span className="font-semibold">{data.pts}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
        <p>No data available for the selected filters</p>
      </div>
    );
  }

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="x"
            name="Goals For"
            label={{ value: 'Goals Scored (GF)', position: 'insideBottom', offset: -5 }}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Goals Against"
            label={{ value: 'Goals Conceded (GA)', angle: -90, position: 'insideLeft' }}
            domain={['dataMin - 5', 'dataMax + 5']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            data={chartData}
            fill="#00FF85"
          >
            {chartData.map((entry) => (
              <Cell
                key={`cell-${entry.team_id}`}
                fill={colors[entry.index % colors.length]}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttackDefenseChart;
