import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";

export const LocationCombobox = ({ options, value, onChange, placeholder, disabled = false }) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (currentValue) => {
    onChange(currentValue === value ? "" : currentValue);
    setOpen(false);
  };

  const displayValue = value
    ? options.find((option) => option.value === value)?.label
    : `Selecciona ${placeholder}...`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={`Seleccionar ${placeholder}. Valor actual: ${displayValue}`}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={`Buscar ${placeholder.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};