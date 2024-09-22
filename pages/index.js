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
                <div className="schools">
                    <a href="https://www.utoronto.ca/">University of Toronto</a>
                    <a href="https://uwaterloo.ca/">Waterloo</a>
                </div>
                <button className="upload-button">Upload Salary</button>
            </nav>
            <div className="hero">
                <h1>WLU Co-op Salary</h1>
                <p>Find the best co-op jobs and salaries available for students.</p>
                <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>
            {error ? (
                <p>Error: {error}</p>
            ) : (
                <div className="table-section">
                    {filteredJobs.length > 0 ? (
                        <div className="table-container">
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
                        </div>
                    ) : (
                        <p>No information found.</p>
                    )}
                </div>
            )}
            <style jsx>{`
                body {
                    font-family: 'Inter', sans-serif; 
                    background-color: #121212;
                    color: white;
                }
                .container {
                    padding: 20px;
                }
                .navbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                }
                .logo {
                    height: 40px;
                    margin-right: 20px;
                }
                .schools {
                    display: flex;
                    justify-content: center;
                    background-color: #2a1863;
                    border-radius: 20px;
                    padding: 5px;
                }
                .schools a {
                    color: white;
                    padding: 10px 15px;
                    text-decoration: none;
                    margin: 0 5px;
                }
                .upload-button {
                    background-color: #2a1863;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    border-radius: 20px;
                    cursor: pointer;
                }
                .hero {
                    text-align: center;
                    margin: 40px 0;
                }
                .search-input {
                    width: 60%;
                    padding: 10px;
                    margin-top: 10px;
                    margin-bottom: 40px;
                }
                .table-section {
                    max-height: 400px; /* Fixed height for the section */
                    overflow: hidden;
                }
                .table-container {
                    height: 100%; /* Full height of the section */
                    overflow: auto; /* Enable scrolling */
                    padding-top: 20px;
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
                    background-color: #2a1863;
                    color: white;
                }
            `}</style>
        </div>
    );
}