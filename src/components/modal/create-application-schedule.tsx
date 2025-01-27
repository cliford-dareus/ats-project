'use client'

import React, {useEffect, useState} from 'react';
import {useUser} from "@clerk/nextjs";
import {createCalendarEvent, getCalendarEventTimes} from "@/server/google-calenda";
import {Button} from "@/components/ui/button";

const CreateApplicationSchedule = () => {
    const {user} = useUser();
    const [slots, setSlots] = useState<{ start: Date; end: Date }[]>([]);

    useEffect(() => {
        if(!user) {
            return;
        }
        const slots = async () => {
            const response =  await getCalendarEventTimes(user.id, {start: new Date("1/1/2025"), end: new Date("2/2/2025")})
            setSlots(response)
        }
        slots();
    }, [user]);

    if(!user) {
        return null;
    }

    return (
        <div>
            <div>
                {slots.map((slot, index) => (
                    <div key={index}>
                        {slot.start.toString()} - {slot.end.toString()}
                    </div>
                ))}
            </div>

            <Button
                onClick={async () =>{
                    const d= await createCalendarEvent({clerkUserId: user.id,
                        guestName: "",
                        guestEmail: user?.emailAddresses[0].emailAddress as string,
                        startTime: new Date(),
                        guestNotes: "Test Notes",
                        durationInMinutes: 24,
                        eventName: "Test Event",})
                    console.log(d)
                }}
            >
                ADD EVENT
            </Button>
        </div>
    );
};

export default CreateApplicationSchedule;