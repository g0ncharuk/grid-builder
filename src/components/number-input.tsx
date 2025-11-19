import { ButtonGroup } from "./ui/button-group";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useCallback, type ChangeEvent } from "react";
import { Minus, Plus } from "lucide-react";

type NumberInputProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
};

export function NumberInput({
  value,
  onChange,
  min = 1,
  max = 99,
}: NumberInputProps) {
  const handleValueChange = useCallback(
    (newValue: number) => {
      if (!isNaN(newValue) && newValue >= min && newValue <= max) {
        onChange(newValue);
      }
    },
    [onChange, min, max]
  );

  const handleInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = parseInt(e.target.value, 10);
      handleValueChange(value);
    },
    [handleValueChange]
  );

  return (
    <div className="grid w-full max-w-sm gap-6">
      <ButtonGroup>
        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          aria-label="Decrement"
          onClick={() => handleValueChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          <Minus />
        </Button>
        <Input
          id="number-of-gpus-f6l"
          value={value}
          onChange={handleInput}
          size={3}
          className="h-8 w-14! font-mono"
          maxLength={3}
        />

        <Button
          variant="outline"
          size="icon-sm"
          type="button"
          aria-label="Increment"
          onClick={() => handleValueChange(Math.min(max, value + 1))}
          disabled={value >= max}
        >
          <Plus />
        </Button>
      </ButtonGroup>
    </div>
  );
}
