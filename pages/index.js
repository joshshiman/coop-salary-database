export async function getServerSideProps() {
    const res = await fetch('http://localhost:3000/api/jobs');
    const jobs = await res.json();

    return { props: { jobs } };
}

export default function Home({ jobs }) {
    return (
        <div>
            <h1>Co-op Job Repository</h1>
            <input type="text" placeholder="Search..." />
            <div>
                {jobs.map((job) => (
                    <div key={job.id}>
                        <h3>{job.job_title}</h3>
                        <p>{job.company} - ${job.salary}</p>
                        <p>{job.location}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

import { useState } from 'react';

export default function Home({ jobs }) {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredJobs = jobs.filter(job =>
        job.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <h1>Co-op Job Repository</h1>
            <input
                type="text"
                placeholder="Search..."
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div>
                {filteredJobs.map((job) => (
                    <div key={job.id}>
                        <h3>{job.job_title}</h3>
                        <p>{job.company} - ${job.salary}</p>
                        <p>{job.location}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}


const [sortOrder, setSortOrder] = useState('asc');

const sortedJobs = [...filteredJobs].sort((a, b) =>
    sortOrder === 'asc' ? a.salary - b.salary : b.salary - a.salary
);

return (
    <div>
        <select onChange={(e) => setSortOrder(e.target.value)}>
            <option value="asc">Sort by Salary: Low to High</option>
            <option value="desc">Sort by Salary: High to Low</option>
        </select>
        <div>
            {sortedJobs.map((job) => (
                <div key={job.id}>
                    <h3>{job.job_title}</h3>
                    <p>{job.company} - ${job.salary}</p>
                </div>
            ))}
        </div>
    </div>
);

