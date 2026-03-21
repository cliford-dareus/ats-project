import ExtractFileButton from "@/components/extract-file-button";
import {Button} from "@/components/ui/button";
import {Plus} from "lucide-react";

type ListPageTopProps = {
    name: string;
    count: number;
    file: string;
};

const ListPageTop = ({name, count, file}: ListPageTopProps) => {
    return (
        <div className="flex items-center justify-between p-4 bg-muted rounded-2xl mb-2 w-full">
            <div className="items-center flex gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{name.toUpperCase()}</h1>
                <span className="px-2 bg-slate-300 flex items-center justify-center rounded">
          {count}
        </span>
            </div>

            <div className="flex items-center gap-4">
                <ExtractFileButton status={file}/>
                <Button>
                    sort
                </Button>
            </div>
        </div>
    );
};

export default ListPageTop;
