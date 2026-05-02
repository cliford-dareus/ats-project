import Image from "next/image";
import Xarrow from "react-xarrows";

type Props = {
  to: string;
};

const ArrowConnection = ({to}: Props) => {  
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        <div className="row-start-2 row-end-2  flex items-center justify-center">
          <div id="fromRef" className="rounded-xl overflow-clip">
            <Image src="/create.jpeg" alt="" width={100} height={100}/>
          </div>
        </div>
        <div className="-col-start-2 row-start-3  flex items-center justify-center">
          <div id="toJoinRef" className="rounded-xl overflow-clip">
            <Image src="/join-3.webp" alt="" width={150} height={150}/>
          </div>
        </div>
        
        <div className="-col-start-2 flex items-center justify-center">
          <div id="toCreateRef" className="rounded-xl overflow-clip">
            <Image src="/create-1.webp" alt="" width={150} height={150}/>
          </div>
        </div>
      </div>
      
      {to !="fromRef" && <Xarrow 
        start="fromRef" 
        end={to} 
        // path="grid"
      />};
    </div>
  );
};

export default ArrowConnection;
