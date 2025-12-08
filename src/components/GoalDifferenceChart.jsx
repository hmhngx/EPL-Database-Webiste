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
    if (!standings || standings.length === 0) return null;

    const sortedByGD = [...standings].sort((a, b) => b.gd - a.gd);
    const top10 = sortedByGD.slice(0, 10);

    return {
      labels: top10.map(team => team.club),
      datasets: [
        {
          label: 'Goal Difference',
          data: top10.map(team => team.gd),
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
        No data available for chart
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
