import { useState } from "react";

export default function SearchBar({ setSearchValue, handleSearch }) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setSearchValue(input);
      handleSearch();
    }
  };

  const handleClick = () => {
    setSearchValue(input);
    handleSearch();
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="px-2 py-1 border rounded"
      />
      <button
        onClick={handleClick}
        className="px-4 py-1 bg-blue-500 text-white rounded"
      >
        Search
      </button>
    </div>
  );
}