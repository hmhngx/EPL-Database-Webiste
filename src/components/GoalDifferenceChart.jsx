import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const GoalDifferenceChart = ({ standings }) => {
  const chartData = useMemo(() => {
    if (!standings || standings.length === 0) {
      return null;
    }

    // Sort by goal difference (descending)
    const sortedByGD = [...standings].sort((a, b) => {
      const gdA = parseInt(a.gd || 0, 10);
      const gdB = parseInt(b.gd || 0, 10);
      return gdB - gdA;
    });
    
    const top10 = sortedByGD.slice(0, 10);

    if (top10.length === 0) {
      console.log('GoalDifferenceChart: No teams to display');
      return null;
    }

    return {
      labels: top10.map(team => team.team_name || team.club || 'Unknown Team'),
      datasets: [
        {
          label: 'Goal Difference',
          data: top10.map(team => parseInt(team.gd || 0, 10)),
          backgroundColor: top10.map((team, index) => {
            if (index < 4) return '#00FF85'; // Top 4 - green
            return '#04f5ff'; // Others - blue
          }),
          borderColor: top10.map((team, index) => {
            if (index < 4) return '#00cc6a';
            return '#03d4e0';
          }),
          borderWidth: 2,
        },
      ],
    };
  }, [standings]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Top 10 Teams by Goal Difference',
        font: {
          size: 16,
          weight: 'bold',
        },
        color: '#1f2937',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.parsed.y;
            return `GD: ${value > 0 ? '+' : ''}${value}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value > 0 ? '+' + value : value;
          },
        },
        grid: {
          color: '#e5e7eb',
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  if (!chartData) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No data available for chart</p>
        <p className="text-sm mt-2">
          {standings && standings.length > 0 
            ? `Received ${standings.length} teams but couldn't process data`
            : 'No standings data provided'}
        </p>
      </div>
    );
  }

  if (!chartData.labels || chartData.labels.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>No teams to display</p>
        <p className="text-sm mt-2">Check that standings data contains team names and goal differences</p>
      </div>
    );
  }

  return (
    <div style={{ height: '400px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default GoalDifferenceChart;
