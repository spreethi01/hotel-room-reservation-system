import React, { useState, useEffect } from 'react';

// --- INITIALIZATION UTILITIES ---
const generateInitialRooms = () => {
  const rooms = {};
  // Floors 1 to 9: 10 rooms each (e.g., 101-110)
  for (let floor = 1; floor <= 9; floor++) {
    for (let r = 1; r <= 10; r++) {
      const roomNo = floor * 100 + r;
      rooms[roomNo] = { roomNo, floor, pos: r, isBooked: false };
    }
  }
  // Floor 10: 7 rooms (1001-1007)
  for (let r = 1; r <= 7; r++) {
    const roomNo = 1000 + r;
    rooms[roomNo] = { roomNo, floor: 10, pos: r, isBooked: false };
  }
  return rooms;
};

// --- DISTANCE CALCULATION ---
// Calculates the total travel time between a group of selected rooms
const calculateTotalTravelTime = (selectedRooms) => {
  if (selectedRooms.length <= 1) return 0;
  let totalTime = 0;
  
  // Calculate pairs-wise distances to find the true span/travel impact
  for (let i = 0; i < selectedRooms.length; i++) {
    for (let j = i + 1; j < selectedRooms.length; j++) {
      const r1 = selectedRooms[i];
      const r2 = selectedRooms[j];
      
      if (r1.floor === r2.floor) {
        totalTime += Math.abs(r1.pos - r2.pos);
      } else {
        // Must walk to lift (pos 0), travel vertically, walk to destination room
        const verticalTime = Math.abs(r1.floor - r2.floor) * 2;
        const horizontalTime = r1.pos + r2.pos; 
        totalTime += verticalTime + horizontalTime;
      }
    }
  }
  return totalTime;
};

export default function HotelReservationSystem() {
  const [rooms, setRooms] = useState(generateInitialRooms());
  const [bookingCount, setBookingCount] = useState(1);
  const [message, setMessage] = useState('');
  const [lastBooked, setLastBooked] = useState([]);

  // --- BOOKING ENGINE ---
  const handleBooking = () => {
    const count = parseInt(bookingCount, 10);
    if (isNaN(count) || count < 1 || count > 5) {
      setMessage("⚠️ You can only book between 1 and 5 rooms at a time.");
      return;
    }

    const availableRooms = Object.values(rooms).filter(r => !r.isBooked);
    if (availableRooms.length < count) {
      setMessage(`❌ Not enough rooms available. Only ${availableRooms.length} left.`);
      return;
    }

    let BestCombination = null;
    let minTime = Infinity;

    // --- PRIORITY 1: Same Floor Booking ---
    for (let f = 1; f <= 10; f++) {
      const floorAvailable = availableRooms.filter(r => r.floor === f);
      if (floorAvailable.length >= count) {
        // Find combinations on this floor
        const combos = getCombinations(floorAvailable, count);
        for (const combo of combos) {
          const time = calculateTotalTravelTime(combo);
          if (time < minTime) {
            minTime = time;
            BestCombination = combo;
          }
        }
      }
    }

    // --- PRIORITY 2: Cross-Floor Booking (Fallback) ---
    if (!BestCombination) {
      const allCombos = getCombinations(availableRooms, count);
      for (const combo of allCombos) {
        const time = calculateTotalTravelTime(combo);
        if (time < minTime) {
          minTime = time;
          BestCombination = combo;
        }
      }
    }

    // Execute Booking
    if (BestCombination) {
      const updatedRooms = { ...rooms };
      BestCombination.forEach(r => {
        updatedRooms[r.roomNo].isBooked = true;
      });
      setRooms(updatedRooms);
      setLastBooked(BestCombination.map(r => r.roomNo));
      setMessage(`✅ Successfully booked rooms: ${BestCombination.map(r => r.roomNo).join(', ')} (Travel Time Value: ${minTime} mins)`);
    } else {
      setMessage("❌ Optimization Error: Unable to find an optimal arrangement.");
    }
  };

  // Helper function to find combinations
  function getCombinations(array, k) {
    const result = [];
    function helper(start, combo) {
      if (combo.length === k) {
        result.push([...combo]);
        return;
      }
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        helper(i + 1, combo);
        combo.pop();
      }
    }
    // Optimization flag: if looking across floors, restrict pool size to improve performance
    const optimizedArray = array.length > 25 ? array.slice(0, 25) : array;
    helper(0, []);
    return result;
  }

  // --- RESET SYSTEM ---
  const handleReset = () => {
    setRooms(generateInitialRooms());
    setLastBooked([]);
    setMessage('🔄 System reset complete. All rooms are vacant.');
  };

  // --- GENERATE RANDOM OCCUPANCY ---
  const handleRandomOccupancy = () => {
    const freshRooms = generateInitialRooms();
    Object.keys(freshRooms).forEach(roomNo => {
      // ~40% chance a room gets occupied randomly
      if (Math.random() < 0.4) {
        freshRooms[roomNo].isBooked = true;
      }
    });
    setRooms(freshRooms);
    setLastBooked([]);
    setMessage('🎲 Random occupancy patterns generated.');
  };

  // --- RENDER MATRIX HELPERS ---
  const renderFloorRow = (floorNum) => {
    const maxRooms = floorNum === 10 ? 7 : 10;
    const floorRooms = [];
    for (let r = 1; r <= maxRooms; r++) {
      const roomNo = floorNum === 10 ? 1000 + r : floorNum * 100 + r;
      floorRooms.push(rooms[roomNo]);
    }

    return (
      <div key={floorNum} className="flex items-center gap-2 mb-2">
        {/* Floor label acting as structural wall left boundary */}
        <div className="w-16 text-right font-semibold text-gray-500 pr-2 text-sm">
          F{floorNum}
        </div>
        {/* Rooms Layout */}
        <div className="flex gap-2">
          {floorRooms.map(room => {
            if (!room) return null;
            const isRecent = lastBooked.includes(room.roomNo);
            return (
              <div
                key={room.roomNo}
                className={`w-10 h-10 border text-[10px] flex items-center justify-center font-bold rounded shadow-sm transition-all duration-300
                  ${room.isBooked 
                    ? isRecent 
                      ? 'bg-purple-600 border-purple-800 text-white animate-pulse' 
                      : 'bg-red-500 border-red-700 text-white' 
                    : 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200'
                  }`}
                title={`Room ${room.roomNo}`}
              >
                {room.roomNo}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-md space-y-6 font-sans">
      <h1 className="text-2xl font-bold text-gray-800 border-b pb-3">Hotel Room Reservation System</h1>
      
      {/* Dynamic Controls Bar */}
      <div className="flex flex-wrap gap-4 items-center bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col">
          <label className="text-xs font-semibold text-gray-600 mb-1">No. of Rooms (1-5)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={bookingCount}
            onChange={(e) => setBookingCount(e.target.value)}
            className="w-28 px-3 py-1.5 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          />
        </div>
        
        <div className="flex gap-2 pt-5">
          <button onClick={handleBooking} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded font-medium shadow-sm transition">Book</button>
          <button onClick={handleReset} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-1.5 rounded font-medium shadow-sm transition">Reset</button>
          <button onClick={handleRandomOccupancy} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded font-medium shadow-sm transition">Random</button>
        </div>
      </div>

      {/* Action Notification Message banner */}
      {message && (
        <div className="p-3 text-sm rounded bg-blue-50 border border-blue-200 text-blue-800 font-medium">
          {message}
        </div>
      )}

      {/* Hotel Building Simulation UI Grid */}
      <div className="border border-gray-300 p-4 rounded-xl bg-gray-50 overflow-x-auto">
        <div className="min-w-[550px] flex">
          {/* Lift & Stairs Graphic Column (Left Alignment Area) */}
          <div className="w-16 bg-gradient-to-b from-gray-300 to-gray-400 rounded-l-md flex flex-col items-center justify-between py-4 text-xs text-gray-700 font-black border-r border-gray-400 shadow-inner">
            <span>LIFT</span>
            <div className="h-full border-l border-dashed border-gray-500 my-2"></div>
            <span>STAIRS</span>
          </div>

          {/* Rooms Distribution grid structural matrix */}
          <div className="pl-4 flex flex-col-reverse">
            {Array.from({ length: 10 }, (_, i) => renderFloorRow(i + 1))}
          </div>
        </div>
      </div>

      {/* Legend metadata marker indicator mapping */}
      <div className="flex gap-4 text-xs font-semibold text-gray-600 pt-2 justify-center border-t">
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-green-100 border border-green-400 inline-block rounded"></span> Available</div>
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-red-500 inline-block rounded"></span> Already Full</div>
        <div className="flex items-center gap-1"><span className="w-4 h-4 bg-purple-600 inline-block rounded"></span> Current Booking</div>
      </div>
    </div>
  );
}
