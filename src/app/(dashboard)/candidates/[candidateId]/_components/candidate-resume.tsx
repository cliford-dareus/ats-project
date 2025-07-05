import React from 'react';

type Props = {
    data: any;
}

const CandidateResume = ({data}: Props) => {
    console.log(data);

    return (
        <div>
            <div>
                <object data={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${data.candidate_cv_path}`} type="application/pdf" width="100%" height="500px">
                    <p>Alternative text - include a link <a href={`https://ffwqzrdbkpjdhhnlaxvl.supabase.co/storage/v1/object/public/${data.candidate_cv_path}`}>to the PDF!</a></p>
                </object>
            </div>
        </div>
    );
};

export default CandidateResume;