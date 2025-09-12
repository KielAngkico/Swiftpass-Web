import React, { useState } from "react";
import SuperAdminSidebar from "../../components/SuperAdminSidebar";

const ProgramBuilder = () => {
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [splitName, setSplitName] = useState("");
  const [goal, setGoal] = useState("");
  const [schedule, setSchedule] = useState({});
  
  const handleAddBodyPart = (dayIndex) => {
    const newBlock = {
      body_part: "",
      exercises: 0,
      rep_range: "",
    };
    const updatedDay = [...(schedule[dayIndex] || []), newBlock];
    setSchedule({ ...schedule, [dayIndex]: updatedDay });
  };

  const updateBodyPart = (dayIndex, partIndex, field, value) => {
    const dayBlocks = [...(schedule[dayIndex] || [])];
    dayBlocks[partIndex][field] = value;
    setSchedule({ ...schedule, [dayIndex]: dayBlocks });
  };

  const deleteBodyPart = (dayIndex, partIndex) => {
    const filteredBlocks = [...(schedule[dayIndex] || [])].filter(
      (_, idx) => idx !== partIndex
    );
    setSchedule({ ...schedule, [dayIndex]: filteredBlocks });
  };

  const renderDayBlocks = () => {
    const blocks = [];
    for (let i = 1; i <= daysPerWeek; i++) {
      blocks.push(
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-md"
        >
          <h3 className="text-lg font-bold text-[#5E17EB] mb-4">Day {i}</h3>

          {(schedule[i] || []).map((block, index) => (
            <div key={index} className="flex items-center gap-4 mb-3">
              {/* Bold body part label */}
              <strong className="text-sm text-[#5E17EB] w-20">CHEST:</strong>

              {/* Sub-body part input */}
              <input
                type="text"
                className="input flex-1"
                placeholder="Upper Chest"
                value={block.body_part}
                onChange={(e) =>
                  updateBodyPart(i, index, "body_part", e.target.value)
                }
              />

              {/* # Exercises */}
              <input
                type="number"
                className="input w-24"
                placeholder="#"
                value={block.exercises}
                onChange={(e) =>
                  updateBodyPart(i, index, "exercises", e.target.value)
                }
              />

              {/* Rep Range */}
              <input
                type="text"
                className="input w-28"
                placeholder="Rep Range"
                value={block.rep_range}
                onChange={(e) =>
                  updateBodyPart(i, index, "rep_range", e.target.value)
                }
              />

              {/* ✖️ Delete Button */}
              <button
                onClick={() => deleteBodyPart(i, index)}
                className="text-red-600 text-lg font-bold"
              >
                ✖️
              </button>
            </div>
          ))}

          <button
            onClick={() => handleAddBodyPart(i)}
            className="bg-[#5E17EB] text-white px-4 py-2 rounded-md text-sm mt-1"
          >
            + Add Body Part
          </button>
        </div>
      );
    }
    return blocks;
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <SuperAdminSidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-[#5E17EB] mb-6">🏋️ Program Builder</h1>

        {/* Split Form Card */}
        <div className="bg-white border-l-4 border-[#5E17EB] rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Create New Split
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              className="input"
              type="text"
              placeholder="Split Name (e.g. 5-Day PPL)"
              value={splitName}
              onChange={(e) => setSplitName(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="Days/Week"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
            />
            <select
              className="input"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            >
              <option value="">Select Goal</option>
              <option value="fat_loss">Fat Loss</option>
              <option value="muscle_gain">Muscle Gain</option>
              <option value="strength">Strength</option>
            </select>
          </div>
        </div>

        {/* Dynamic Day Blocks */}
        {renderDayBlocks()}
      </div>
    </div>
  );
};

export default ProgramBuilder;
