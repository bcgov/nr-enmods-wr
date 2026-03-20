# Use Bitnami PostgreSQL 15 as the base image
FROM postgres:15

# Switch to root user to install additional packages
USER root

# Install desired CLI tools like AWS and OpenShift CLI (oc)
RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    miller \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN apt-get update && apt-get install -y curl tar \
    && curl -LO https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable-4.12/openshift-client-linux.tar.gz \
    && tar -xzf openshift-client-linux.tar.gz -C /usr/local/bin oc \
    && rm openshift-client-linux.tar.gz \
    && oc version --client

# Switch back to the default non-root user used by Bitnami images
USER postgres

# (Optional) Expose PostgreSQL port
EXPOSE 5432

