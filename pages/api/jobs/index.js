export async function getServerSideProps() {
    const url = `https://${process.env.VERCEL_URL}/api/jobs`;

    const res = await fetch(url);
    const jobs = res.ok ? await res.json() : []; // Default to an empty array if fetch fails

    return { props: { jobs } };
}

export default function Home({ jobs }) {
    const jobElements = [];

    jobs.forEach((job) => {
        jobElements.push(
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
        );
    });

    return (
        <div>
            <h1>Co-op Job Repository</h1>
            <div>
                {jobElements.length > 0 ? jobElements : <p>No jobs available.</p>}
            </div>
        </div>
    );
}