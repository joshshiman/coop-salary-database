import { useEffect, useState } from 'react';

export async function getServerSideProps() {
    const url = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}/api/jobs` 
        : 'http://localhost:3000/api/jobs';

    const res = await fetch(url);

    if (!res.ok) {
        console.error('Failed to fetch jobs:', res.status);
        return { props: { jobs: [] } }; // Return an empty jobs array
    }
    
    const jobs = await res.json();
    return { props: { jobs } };
}

export default function Home({ jobs }) {
    return (
        <div>
            <h1>Co-op Job Repository</h1>
            <div>
                {jobs.length === 0 ? (
                    <p>No jobs available.</p>
                ) : (
                    jobs.map((job) => (
                        <div key={job.id}>
                            <h3>{job.role}</h3>
                            <p>{job.company} - {job.salary}</p>
                            <p>{job.location}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}