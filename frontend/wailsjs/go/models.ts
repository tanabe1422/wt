export namespace config {
	
	export class ExternalTool {
	    preset: string;
	    path: string;
	    args: string;
	
	    static createFrom(source: any = {}) {
	        return new ExternalTool(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.preset = source["preset"];
	        this.path = source["path"];
	        this.args = source["args"];
	    }
	}
	export class Settings {
	    repositories: string[];
	    activeRepository: string;
	    diffTool: ExternalTool;
	    mergeTool: ExternalTool;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repositories = source["repositories"];
	        this.activeRepository = source["activeRepository"];
	        this.diffTool = this.convertValues(source["diffTool"], ExternalTool);
	        this.mergeTool = this.convertValues(source["mergeTool"], ExternalTool);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace git {
	
	export class AmendInfo {
	    canAmend: boolean;
	    reason: string;
	    headMessage: string;
	
	    static createFrom(source: any = {}) {
	        return new AmendInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.canAmend = source["canAmend"];
	        this.reason = source["reason"];
	        this.headMessage = source["headMessage"];
	    }
	}
	export class BranchEntry {
	    name: string;
	    isCurrent: boolean;
	    isRemote: boolean;
	    hasUpstream: boolean;
	    aheadCount: number;
	    behindCount: number;
	
	    static createFrom(source: any = {}) {
	        return new BranchEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.isCurrent = source["isCurrent"];
	        this.isRemote = source["isRemote"];
	        this.hasUpstream = source["hasUpstream"];
	        this.aheadCount = source["aheadCount"];
	        this.behindCount = source["behindCount"];
	    }
	}
	export class BranchHeadCommit {
	    sha: string;
	
	    static createFrom(source: any = {}) {
	        return new BranchHeadCommit(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sha = source["sha"];
	    }
	}
	export class BranchHead {
	    name: string;
	    commit: BranchHeadCommit;
	
	    static createFrom(source: any = {}) {
	        return new BranchHead(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.commit = this.convertValues(source["commit"], BranchHeadCommit);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class CommitAuthor {
	    name: string;
	    email?: string;
	    date: string;
	
	    static createFrom(source: any = {}) {
	        return new CommitAuthor(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.email = source["email"];
	        this.date = source["date"];
	    }
	}
	export class CommitDetails {
	    author: CommitAuthor;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new CommitDetails(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.author = this.convertValues(source["author"], CommitAuthor);
	        this.message = source["message"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CommitFileChange {
	    path: string;
	    oldPath?: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new CommitFileChange(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.oldPath = source["oldPath"];
	        this.status = source["status"];
	    }
	}
	export class CommitParent {
	    sha: string;
	
	    static createFrom(source: any = {}) {
	        return new CommitParent(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sha = source["sha"];
	    }
	}
	export class CommitLogEntry {
	    sha: string;
	    commit: CommitDetails;
	    parents: CommitParent[];
	
	    static createFrom(source: any = {}) {
	        return new CommitLogEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.sha = source["sha"];
	        this.commit = this.convertValues(source["commit"], CommitDetails);
	        this.parents = this.convertValues(source["parents"], CommitParent);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class DiffLine {
	    kind: string;
	    content: string;
	    oldNo?: number;
	    newNo?: number;
	
	    static createFrom(source: any = {}) {
	        return new DiffLine(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.content = source["content"];
	        this.oldNo = source["oldNo"];
	        this.newNo = source["newNo"];
	    }
	}
	export class DiffHunk {
	    header: string;
	    lines: DiffLine[];
	
	    static createFrom(source: any = {}) {
	        return new DiffHunk(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.header = source["header"];
	        this.lines = this.convertValues(source["lines"], DiffLine);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class FileDiff {
	    path: string;
	    hunks: DiffHunk[];
	
	    static createFrom(source: any = {}) {
	        return new FileDiff(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.hunks = this.convertValues(source["hunks"], DiffHunk);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class FileStatus {
	    path: string;
	    index: string;
	    workTree: string;
	    staged: boolean;
	    isDirectory: boolean;
	
	    static createFrom(source: any = {}) {
	        return new FileStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.index = source["index"];
	        this.workTree = source["workTree"];
	        this.staged = source["staged"];
	        this.isDirectory = source["isDirectory"];
	    }
	}
	export class ListCommitsResult {
	    commits: CommitLogEntry[];
	    hasMore: boolean;
	    nextSkip: number;
	
	    static createFrom(source: any = {}) {
	        return new ListCommitsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commits = this.convertValues(source["commits"], CommitLogEntry);
	        this.hasMore = source["hasMore"];
	        this.nextSkip = source["nextSkip"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class RemoteMergeEntry {
	    name: string;
	    merged: boolean;
	    lastCommitAt: string;
	
	    static createFrom(source: any = {}) {
	        return new RemoteMergeEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.merged = source["merged"];
	        this.lastCommitAt = source["lastCommitAt"];
	    }
	}
	export class StashEntry {
	    index: number;
	    ref: string;
	    message: string;
	
	    static createFrom(source: any = {}) {
	        return new StashEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.ref = source["ref"];
	        this.message = source["message"];
	    }
	}
	export class WorktreeEntry {
	    path: string;
	    branch: string;
	    isMain: boolean;
	    isBare: boolean;
	    isLocked: boolean;
	    changedFileCount: number;
	
	    static createFrom(source: any = {}) {
	        return new WorktreeEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.branch = source["branch"];
	        this.isMain = source["isMain"];
	        this.isBare = source["isBare"];
	        this.isLocked = source["isLocked"];
	        this.changedFileCount = source["changedFileCount"];
	    }
	}

}

