import { UpdateData, UpdateDefinition } from "./SubscriptionManager";
import { ApiPool } from "../../components/api/responses/ApiPool";
import { Api } from "../../components/api/Api";
import { PageDefintion, Page } from "../../components/data/Page";
import { RE6Module } from "../../components/RE6Module";
import { Subscription } from "./Subscription";
import { ApiPost } from "../../components/api/responses/ApiPost";
import { Post } from "../../components/data/Post";

export class PoolSubscriptions extends RE6Module implements Subscription {
    updateDefinition: UpdateDefinition = {
        imageSrc: data => {
            return Post.createPreviewUrlFromMd5(data.thumbnailMd5);
        },
        imageHref: data => {
            return `https://e621.net/pools/${data.id}`;
        },
        updateHref: data => {
            return `https://e621.net/posts/${data.last}?pool_id=${data.id}`;
        },
        updateText: data => {
            return data.name;
        },
        sourceHref: data => {
            return `https://e621.net/pools/${data.id}`;
        },
        sourceText: data => {
            return "All Posts";
        }
    }

    limit: number;
    lastUpdate: number;
    tab: JQuery<HTMLElement>;

    private static instance: PoolSubscriptions;

    public getName(): string {
        return "Pools";
    }

    public addSubscribeButtons() {
        if (Page.matches(PageDefintion.pool)) {
            let $header = $("div#c-pools > div#a-show > h1").first();
            let subscribeButton = $("<button>")
                .addClass("subscribe-button subscribe")
                .html("Subscribe")
                .appendTo($header);
            let unsubscribeButton = $("<button>")
                .addClass("subscribe-button unsubscribe")
                .html("Unsubscribe")
                .appendTo($header);

            let poolData: PoolSettings = this.fetchSettings("pools", true);

            if (poolData[parseInt(Page.getPageID())] === undefined) {
                unsubscribeButton.addClass("hidden");
            } else { subscribeButton.addClass("hidden"); }

            subscribeButton.click((event) => {
                subscribeButton.toggleClass("hidden");
                unsubscribeButton.toggleClass("hidden");
                poolData = this.fetchSettings("pools", true);
                const pageId = parseInt(Page.getPageID())
                poolData[pageId] = {};
                this.pushSettings("pools", poolData);
            });
            unsubscribeButton.click((event) => {
                subscribeButton.toggleClass("hidden");
                unsubscribeButton.toggleClass("hidden");
                poolData = this.fetchSettings("pools", true);

                delete poolData[parseInt(Page.getPageID())];
                this.pushSettings("pools", poolData);
            });
        }
    }

    public async getUpdatedEntries() {
        let results: UpdateData[] = [];

        let poolData: PoolSettings = this.fetchSettings("pools", true);
        if (Object.keys(poolData).length === 0) {
            return results;
        }

        let poolsJson: ApiPool[] = await Api.getJson("/pools.json?search[id]=" + Object.keys(poolData).join(","));
        for (const poolJson of poolsJson) {
            if (new Date(poolJson.updated_at).getTime() > this.lastUpdate) {
                results.push(await this.formatPoolUpdate(poolJson, poolData));
            }
        }
        this.pushSettings("pools", poolData);
        return results;
    }

    private async formatPoolUpdate(value: ApiPool, poolInfo: PoolSettings): Promise<UpdateData> {
        if (poolInfo[value.id].thumbnailMd5 === undefined) {
            const post: ApiPost = (await Api.getJson(`/posts/${value.post_ids[0]}.json`)).post;
            poolInfo[value.id].thumbnailMd5 = post.file.md5;
        }
        return {
            id: value.id,
            name: value.name.replace(/_/g, " "),
            date: new Date(value.updated_at),
            last: value.post_ids[value.post_ids.length - 1],
            thumbnailMd5: poolInfo[value.id].thumbnailMd5
        };
    }

    /**
     * Returns a set of default settings values
     * @returns Default settings
     */
    protected getDefaultSettings() {
        return {
            enabled: true,
            pools: {}
        };
    }

    public static getInstance() {
        if (this.instance == undefined) this.instance = new PoolSubscriptions();
        return this.instance;
    }
}



export interface PoolSettings {
    [poolId: number]: PoolInfo
}

interface PoolInfo {
    thumbnailMd5?: string;
}
