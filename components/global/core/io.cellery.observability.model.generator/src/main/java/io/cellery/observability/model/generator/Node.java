/*
 * Copyright (c) 2019, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package io.cellery.observability.model.generator;

import java.util.HashSet;
import java.util.Set;

/**
 * This is the POJO to store the asset related details in the document.
 */
public class Node implements Comparable {
    private String id;
    private Set<String> components;
    private Set<String> edges;

    Node(String name) {
        this(name, null);
    }

    Node(String name, String tags) {
        this.id = name;
        this.components = new HashSet<>();
        this.edges = new HashSet<>();
    }

    public String getId() {
        return id;
    }

    public void addComponent(String component) {
        this.components.add(component);
    }

    public void addEdge(String serviceEdge) {
        this.edges.add(serviceEdge);
    }

    public int compareTo(Object anotherNode) {
        if (anotherNode != null && anotherNode instanceof Node) {
            if (this.equals(anotherNode)) {
                return 0;
            }
            return id.compareTo(((Node) anotherNode).id);
        } else {
            return -1;
        }
    }

    public boolean equals(Object object) {
        return object != null && object instanceof Node && id.equalsIgnoreCase(((Node) object).id);
    }


    public Set<String> getComponents() {
        return components;
    }

    public Set<String> getEdges() {
        return edges;
    }

    public int hashCode() {
        return id.hashCode();
    }
}
