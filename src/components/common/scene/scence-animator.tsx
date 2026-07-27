"use client";

import { motion, AnimatePresence } from "framer-motion";

import { useEffect, useRef, useState } from "react";
import IntroScene from "./intro-scene";
import LogoScene from "./logo-scene";

export const SCENE_DURATIONS: Record<string, number> = {
    intro: 3500,
    logo: 5000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
    intro: IntroScene,
    logo: LogoScene,
};

const bgPositions = [
    { scale: 1.2, x: '0%', y: '0%', opacity: 0.15 },
    { scale: 1.5, x: '-20%', y: '10%', opacity: 0.2 },
    // { scale: 1.1, x: '10%', y: '-10%', opacity: 0.1 },
    // { scale: 1.0, x: '0%', y: '0%', opacity: 0.25 },
];

const gridOpacities = [0.03, 0.05, 0.04, 0.02];

const SceneAnimator = ({ }) => {
    const sceneKeys = useRef(Object.keys(SCENE_DURATIONS)).current;
    const totalScenes = sceneKeys.length;
    const durationsArray = useRef(Object.values(SCENE_DURATIONS)).current;

    const [currentScene, setCurrentScene] = useState(0);
    const currentSceneKey = sceneKeys[currentScene];

    const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(currentSceneKey);
    const SceneComponent = SCENE_COMPONENTS[currentSceneKey];

    useEffect(() => {
        const currentDuration = durationsArray[currentScene];

        const timer = setTimeout(() => {
            // Last scene just finished playing
            if (currentScene >= totalScenes - 1) {

            } else {
                setCurrentScene(prev => prev + 1);
            }
        }, currentDuration);

        return () => clearTimeout(timer);
    }, [currentScene, totalScenes, durationsArray]);
    return (
        <div className="w-full h-screen overflow-hidden relative bg-background font-body">
            {/* Persistent Background Layer */}
            <div className="absolute inset-0 z-0">
                {/* Animated Grid */}
                <motion.div
                    className="absolute inset-[-50%] bg-[linear-gradient(#2F8D8F_1px,transparent_1px),linear-gradient(90deg,#2F8D8F_1px,transparent_1px)] bg-[size:4vw_4vw]"
                    animate={{
                        opacity: gridOpacities[sceneIndex] ?? 0.03,
                        rotate: sceneIndex === 3 ? 0 : 5,
                        scale: sceneIndex === 3 ? 1 : 1.1,
                    }}
                    transition={{ duration: 2, ease: "easeInOut" }}
                />

                {/* Floating Glowing Orbs */}
                <motion.div
                    className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px] bg-[var(--color-accent)] mix-blend-screen"
                    style={{ top: '10%', left: '10%' }}
                    animate={bgPositions[sceneIndex] ?? bgPositions[0]}
                    transition={{ duration: 3, ease: [0.25, 0.1, 0.25, 1] }}
                />
                <motion.div
                    className="absolute w-[60vw] h-[60vw] rounded-full blur-[100px] bg-[var(--color-primary)] mix-blend-screen"
                    style={{ bottom: '-10%', right: '-10%' }}
                    animate={{
                        scale: [1, 1.2, 0.9, 1.1][sceneIndex] ?? 1,
                        x: ['0%', '10%', '-5%', '0%'][sceneIndex] ?? '0%',
                        opacity: [0.2, 0.3, 0.2, 0.4][sceneIndex] ?? 0.2,
                    }}
                    transition={{ duration: 3, ease: [0.25, 0.1, 0.25, 1] }}
                />
            </div>

            {/* Foreground Scenes */}
            <div className="relative z-10 w-full h-full">
                <AnimatePresence mode="popLayout">
                    {SceneComponent && <SceneComponent key={currentSceneKey} />}
                </AnimatePresence>
            </div>
        </div>
    )
};

export default SceneAnimator;
