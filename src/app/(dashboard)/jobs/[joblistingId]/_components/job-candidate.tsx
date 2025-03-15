import {ApplicationType} from "@/types";

type Props = {
  data: ApplicationType[];
};

const JobCandidate = ({ data }: Props) => {
  return <div className="">{JSON.stringify(data)}</div>;
};

export default JobCandidate;
