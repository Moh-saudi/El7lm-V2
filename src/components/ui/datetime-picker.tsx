"use client";

import * as React from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { cn } from "@/lib/utils/index";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

interface DateTimePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    /**
     * Optional: if you want to control time separately as a string "HH:mm"
     * If provided, the component will try to sync the Date object's time with this string.
     */
    timeString?: string;
    setTimeString?: (time: string) => void;
}

export function DateTimePicker({
    date,
    setDate,
    timeString,
    setTimeString,
}: DateTimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Sync internal time state with provided props
    const [selectedHour, setSelectedHour] = React.useState("20");
    const [selectedMinute, setSelectedMinute] = React.useState("00");

    React.useEffect(() => {
        if (timeString) {
            const [h, m] = timeString.split(":");
            if (h && m) {
                setSelectedHour(h);
                setSelectedMinute(m);
            }
        } else if (date) {
            setSelectedHour(format(date, "HH"));
            setSelectedMinute(format(date, "mm"));
        }
    }, [timeString, date]);

    const handleDateSelect = (newDate: Date | undefined) => {
        if (!newDate) {
            setDate(undefined);
            return;
        }
        // Preserve current time selection
        const updatedDate = new Date(newDate);
        updatedDate.setHours(parseInt(selectedHour));
        updatedDate.setMinutes(parseInt(selectedMinute));
        setDate(updatedDate);
    };

    const handleTimeChange = (type: "hour" | "minute", value: string) => {
        let newH = selectedHour;
        let newM = selectedMinute;

        if (type === "hour") {
            newH = value;
            setSelectedHour(value);
        } else {
            newM = value;
            setSelectedMinute(value);
        }

        // Update parent
        if (setTimeString) {
            setTimeString(`${newH}:${newM}`);
        }

        // Update date object if it exists
        if (date) {
            const updatedDate = new Date(date);
            updatedDate.setHours(parseInt(newH));
            updatedDate.setMinutes(parseInt(newM));
            setDate(updatedDate);
        }
    };

    const hours = Array.from({ length: 24 }, (_, i) =>
        i.toString().padStart(2, "0")
    );
    const minutes = Array.from({ length: 12 }, (_, i) =>
        (i * 5).toString().padStart(2, "0")
    );

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-right font-normal ltr:flex-row-reverse",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {date ? (
                        format(date, "PPP HH:mm", { locale: ar })
                    ) : (
                        <span>اختر التاريخ والوقت</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse">
                    <div className="p-3">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            locale={ar}
                            initialFocus
                        />
                    </div>
                    <div className="flex flex-col p-3 gap-2">
                        <Label className="text-center text-xs font-semibold text-muted-foreground pb-1">الوقت</Label>
                        <div className="flex h-[260px] divide-x divide-x-reverse border rounded-md">
                            <ScrollArea className="w-16">
                                <div className="flex flex-col p-1">
                                    {hours.map((hour) => (
                                        <Button
                                            key={hour}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "shrink-0 my-0.5",
                                                selectedHour === hour && "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                                            )}
                                            onClick={() => handleTimeChange("hour", hour)}
                                        >
                                            {hour}
                                        </Button>
                                    ))}
                                </div>
                            </ScrollArea>
                            <ScrollArea className="w-16">
                                <div className="flex flex-col p-1">
                                    {minutes.map((minute) => (
                                        <Button
                                            key={minute}
                                            variant="ghost"
                                            size="sm"
                                            className={cn(
                                                "shrink-0 my-0.5",
                                                selectedMinute === minute && "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                                            )}
                                            onClick={() => handleTimeChange("minute", minute)}
                                        >
                                            {minute}
                                        </Button>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                        <div className="text-center text-sm font-bold mt-2 border-t pt-2">
                            {selectedHour}:{selectedMinute}
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
