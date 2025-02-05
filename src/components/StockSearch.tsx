import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface StockSearchProps {
  onSearch: (symbol: string) => void;
  initialSymbol?: string;
}

const HISTORY_KEY = "stockSearchHistory";
const MAX_HISTORY_ITEMS = 5;

export const StockSearch = ({ onSearch, initialSymbol = '' }: StockSearchProps) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [open, setOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Update symbol when initialSymbol changes
  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  const updateSearchHistory = (newSymbol: string) => {
    const updatedHistory = [
      newSymbol,
      ...searchHistory.filter((s) => s !== newSymbol),
    ].slice(0, MAX_HISTORY_ITEMS);
    
    setSearchHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (symbol.trim()) {
      const upperSymbol = symbol.toUpperCase();
      onSearch(upperSymbol);
      updateSearchHistory(upperSymbol);
      console.log("Search submitted for:", upperSymbol);
    }
  };

  const handleHistorySelect = (selectedSymbol: string) => {
    setSymbol(selectedSymbol);
    onSearch(selectedSymbol);
    updateSearchHistory(selectedSymbol);
    setOpen(false);
    console.log("Selected from history:", selectedSymbol);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 relative">
      <div className="relative">
        <Input
          placeholder="Enter stock symbol (e.g. TSLA)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="max-w-[200px]"
          onFocus={() => setOpen(true)}
        />
        {open && searchHistory.length > 0 && (
          <div className="absolute top-[100%] w-full z-50">
            <Command className="rounded-lg border shadow-md bg-popover">
              <CommandList>
                <CommandGroup heading="Recent Searches">
                  {searchHistory.map((historySymbol) => (
                    <CommandItem
                      key={historySymbol}
                      onSelect={() => handleHistorySelect(historySymbol)}
                      className="cursor-pointer"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {historySymbol}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}
      </div>
      <Button type="submit">
        <Search className="h-4 w-4 mr-2" />
        Search
      </Button>
    </form>
  );
};