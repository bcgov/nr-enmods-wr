import React from "react"
import { Link } from "react-router-dom"

const Home = () => {
  return (
    <div className="p-2">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Welcome to EnMoDS Web Reporting Reporting
      </h1>

      <p className="text-lg text-gray-700 mb-4">
        The{" "}
        <span className="font-semibold">
          Environmental Monitoring System (EMS)
        </span>{" "}
        is the Ministry's primary data repository for environmental monitoring
        data. EMS captures a broad range of data including physical, chemical,
        and biological analyses of water, air, soil, and waste discharges, as
        well as data from ambient environmental monitoring throughout the
        province.
      </p>

      <p className="text-lg text-gray-700 mb-4">
        Samples are collected by ministry staff, permit holders under the{" "}
        <span className="italic">Environmental Management Act</span>, or
        authorized third parties. When sampling is tied to a permit requirement,
        the samples must be analyzed at a{" "}
        <span className="font-semibold">qualified laboratory</span>. The
        majority of data is submitted electronically using{" "}
        <span className="font-semibold">Electronic Data Transfer (EDT)</span>.
      </p>

      <p className="text-lg text-gray-700 mb-6">
        The <span className="font-semibold">EnMoDS Web Reporting</span> tool
        provides read-only access to EMS data. Users can leverage advanced
        search features to locate and download environmental data as{" "}
        <span className="font-mono">.csv</span> files. To begin exploring data,
        visit the{" "}
        <Link
          to="/search"
          className="text-blue-600 hover:underline font-semibold"
        >
          search page
        </Link>
        .
      </p>

      <div className="border-t pt-6 text-sm text-gray-500">
        Need help? Check out the documentation or contact EMS support.
      </div>
    </div>
  )
}

export default Home
