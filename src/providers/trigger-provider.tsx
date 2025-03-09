"use client"

import React, { createContext, useContext, useState } from 'react';
import { StageTrigger } from "@/plugins/smart-trigger/types";

type TriggerContextType = {
  triggers: StageTrigger[];
  setTriggers: (triggers: StageTrigger[]) => void;
  addTrigger: (trigger: StageTrigger) => void;
  executeTrigger: (stage: number) => void;
};

const TriggerContext = createContext<TriggerContextType>({
  triggers: [],
  setTriggers: () => {},
  addTrigger: () => {},
  executeTrigger: () => {}
});

export const TriggerProvider = ({ children }: { children: React.ReactNode }) => {
  const [triggers, setTriggers] = useState<StageTrigger[]>([]);
  // console.log(triggers)

  const addTrigger = (newTrigger: StageTrigger) => {
    // setTriggers(prev => [...prev, newTrigger]);
  };

  const executeTrigger = (stage: number) => {
    const stageTriggers = triggers.filter(t => Number(t.id) === stage);
    
    stageTriggers.forEach(trigger => {    
      console.log(trigger)
      trigger.actions.forEach(action => {
        console.log(action)
        switch (action.action_type) {
          case 'MESSAGE':
            console.log(`Message sent: ${action.config.template}`);
            break;
          case 'NOTE':
            console.log(`Moving to stage: ${action.config.targetStage}`);
            break;
          case 'INTERVIEW':
            console.log(`Tag added: ${action.config.tag}`);
            break;
        }
      });
    });
  };

  return (
    <TriggerContext.Provider value={{ triggers, setTriggers, addTrigger, executeTrigger }}>
      {children}
    </TriggerContext.Provider>
  );
};

export const useTriggers = () => useContext(TriggerContext);
