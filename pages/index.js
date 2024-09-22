export async function getServerSideProps() {
    const url = `https://${process.env.VERCEL_URL}/api/jobs`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Fetch failed with status: ${res.status}`);
        }
        
        const jobs = await res.json();
        if (!Array.isArray(jobs)) {
            throw new Error('Invalid data format');
        }

        return { props: { jobs } };
    } catch (error) {
        console.error(error);
        return { props: { jobs: [], error: error.message || 'An error occurred' } };
    }
}

export default function Home({ jobs, error }) {
    return (
        <div>
            <h1>Co-op Job Repository</h1>
            {error ? (
                <p>Error: {error}</p>
            ) : (
                <div>
                    {jobs.length > 0 ? (
                        jobs.map((job) => (
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
                        ))
                    ) : (
                        <p>No information found.</p>
                    )}
                </div>
            )}
        </div>
    );
}