import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

const GoalsFilter = ({ goalsSlider, setGoalsSlider, minGoals, setMinGoals, maxGoals, setMaxGoals }) => {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Total Goals (Max: {goalsSlider})
      </label>
      <div className="px-2">
        <Slider
          min={0}
          max={10}
          value={goalsSlider}
          onChange={setGoalsSlider}
          trackStyle={{ backgroundColor: '#38003C', height: 5 }}
          handleStyle={{ borderColor: '#38003C', backgroundColor: '#fff', width: 18, height: 18, marginTop: -7 }}
          railStyle={{ backgroundColor: '#E5E7EB', height: 5 }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          placeholder="Min Goals"
          value={minGoals}
          onChange={(e) => setMinGoals(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          min="0"
        />
        <input
          type="number"
          placeholder="Max Goals"
          value={maxGoals}
          onChange={(e) => setMaxGoals(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          min="0"
        />
      </div>
    </div>
  );
};

export default GoalsFilter;