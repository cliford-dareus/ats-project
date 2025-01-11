import React from 'react';

type Props = {
    data: any
}

const CandidateSummary = ({data}: Props) => {
    return (
        <div>
            {JSON.stringify(data, null, 2)}
        </div>
    );
};

export default CandidateSummary;