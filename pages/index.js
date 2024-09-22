import { useState } from 'react';

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
    const [searchTerm, setSearchTerm] = useState('');

    const filteredJobs = jobs.filter(job =>
        job.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="container">
            <nav className="navbar">
                <img src="/logo.png" alt="Logo" className="logo" />
                <div className="dropdown">
                    <button className="dropbtn">Schools</button>
                    <div className="dropdown-content">
                        <a href="https://www.utoronto.ca/">UofT</a>
                        <a href="https://uwaterloo.ca/">Waterloo</a>
                    </div>
                </div>
            </nav>
            <h1>WLU Co-op Salary</h1>
            {error ? (
                <p>Error: {error}</p>
            ) : (
                <div className="hero">
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {filteredJobs.length > 0 ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Role</th>
                                    <th>Company</th>
                                    <th>Salary</th>
                                    <th>Location</th>
                                    <th>Start Date</th>
                                    <th>Duration</th>
                                    <th>Program</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredJobs.map((job) => (
                                    <tr key={job.id}>
                                        <td>{job.role}</td>
                                        <td>{job.company}</td>
                                        <td>{job.salary}</td>
                                        <td>{job.location}</td>
                                        <td>{job.start_date}</td>
                                        <td>{job.duration}</td>
                                        <td>{job.program}</td>
                                        <td>{job.notes || "N/A"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p>No information found.</p>
                    )}
                </div>
            )}
            <style jsx>{`
                body {
                    font-family: 'Arial', sans-serif;
                    background-color: #121212;
                    color: white;
                }
                .container {
                    padding: 20px;
                }
                .navbar {
                    display: flex;
                    align-items: center;
                    background-color: #333;
                    padding: 10px;
                }
                .logo {
                    height: 40px;
                    margin-right: 20px;
                }
                .dropdown {
                    position: relative;
                    display: inline-block;
                }
                .dropbtn {
                    background-color: #333;
                    color: white;
                    padding: 10px;
                    border: none;
                    cursor: pointer;
                }
                .dropdown-content {
                    display: none;
                    position: absolute;
                    background-color: #f9f9f9;
                    min-width: 160px;
                    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                    z-index: 1;
                }
                .dropdown:hover .dropdown-content {
                    display: block;
                }
                .hero {
                    margin-top: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    border: 1px solid #444;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #555;
                }
            `}</style>
        </div>
    );
}