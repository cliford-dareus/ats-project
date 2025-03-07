import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  title: string;
  description: string;
  end: number;
  duration: number;
};

const StatCard = ({ title, description, end, duration }: Props) => {
  const [count, setCount] = useState(0);
  
    useEffect(() => {
      let start = 0;
      const increment = end / (duration * 1000 / 16); // Update every ~16ms for smooth animation
      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          clearInterval(timer);
          setCount(end);
        } else {
          setCount(Math.ceil(start));
        }
      }, 16);
  
      return () => clearInterval(timer); // Cleanup on unmount
    }, [end, duration]);
  
  return (
    <div className="p-4 shadow rounded flex flex-col bg-card text-card-foreground">
        <div className="flex gap-2 items-center text-blue-500">
            <p className="font-bold text-2xl">{count}</p>
            <div
                className="flex items-center justify-center gap-2 bg-blue-200 rounded-full h-[20px] w-[20px]">
                <ArrowUp size={16}/>
            </div>
        </div>
        <h3 className="text-muted-foreground">{title}</h3>
      <span className="text-xs text-muted-foreground">{description}</span>
    </div>
  );
};

export default StatCard;