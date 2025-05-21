import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  error?: string;
}

export function DatePicker({ value, onChange, label, error }: DatePickerProps) {
  // Gestione dello stato interno del calendario
  const [date, setDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [isOpen, setIsOpen] = useState(false);

  // Aggiorna la data interna quando il valore esterno cambia
  useEffect(() => {
    if (value) {
      setDate(new Date(value));
    } else {
      setDate(undefined);
    }
  }, [value]);

  // Gestisce la selezione della data
  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    
    if (selectedDate) {
      // Formatta la data nel formato ISO per il modulo (yyyy-MM-dd)
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      onChange(formattedDate);
      
      // Chiudi il popup dopo la selezione
      setIsOpen(false);
    }
  };

  // Calcola la data minima selezionabile (oggi)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="relative mb-4">
      <div className="block text-neutral-700 font-medium mb-2">
        {label}
      </div>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-neutral-100 rounded-lg px-4 py-3 border border-neutral-300 h-auto",
              !date && "text-neutral-500",
              error && "border-red-500"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(date, "dd/MM/yyyy", { locale: it })
            ) : (
              <span>Seleziona una data</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleSelect}
            disabled={(date) => date < today}
            fromMonth={today}
            classNames={{
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-neutral-500 rounded-md w-8 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: cn(
                "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-neutral-100",
                "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
              ),
              day: cn(
                "h-8 w-8 p-0 font-normal aria-selected:opacity-100 hover:bg-neutral-100 rounded-md"
              ),
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-neutral-200 text-neutral-900",
              day_disabled: "text-neutral-400 opacity-50",
              day_outside: "text-neutral-400 opacity-50",
            }}
            locale={it}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}