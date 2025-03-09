// import { cleanupPlugins, initializePlugins } from "@/lib/plugin-lifecycle";
import { PluginConfig } from "@/lib/plugins-registry";
import React, { useState } from "react";
import { StageTrigger } from "./types";

const SmartTriggers = () => {
  // const [triggers, setTriggers] = useState<StageTrigger[]>([]);
 
  return (
    <div>
      <h2>Smart Triggers</h2>
      <p>Automate your recruitment workflows with Smart Triggers.</p>
    </div>
  );
};

const pluginConfig = {
  id: "smart-triggers",
  name: "Smart Triggers", 
  description: "Automate recruitment workflows with triggers.",
  version: "1.0.0",
  component: SmartTriggers,
  // activate: initializePlugins,
  // deactivate: cleanupPlugins
} as PluginConfig;

export default pluginConfig;
