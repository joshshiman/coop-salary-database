import { useEffect } from 'react';

export async function getServerSideProps() {
    const url = `https://${process.env.VERCEL_URL}/api/jobs`; 

    const res = await fetch(url);

    if (!res.ok) {
        return { props: { jobs: [] } };
    }
    
    const jobs = await res.json();
    return { props: { jobs } };
}

export default function Home({ jobs }) {
    return (
        <div>
            <h1>Co-op Job Repository</h1>
            <div>
                {jobs.map((job) => (
                    <div key={job.id}>
                        <h3>{job.role}</h3>
                        <p>Company: {job.company}</p>
                        <p>Salary: {job.salary}</p>
                        <p>Location: {job.location}</p>
                        <p>Start Date: {job.start_date}</p>
                        <p>Duration: {job.duration}</p>
                        <p>Program: {job.program}</p>
                        <p>Notes: {job.notes || "N/A"}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}