use discord_rich_presence::activity::{Activity, ActivityType, Assets, Button, Party, Timestamps};
use discord_rich_presence::{DiscordIpc, DiscordIpcClient};
use parking_lot::Mutex;

#[derive(Default, Clone)]
#[allow(dead_code)]
pub struct DiscordAssets {
    pub details: String,
    pub state: String,
    pub details_url: String,
    pub big_icon: String,
    pub big_icon_text: String,
    pub small_icon: String,
    pub small_icon_text: String,
    pub start_time: i64,
    pub end_time: i64,
    pub party_id: String,
    pub party_size: i64,
    pub party_max_size: i64,
    pub button_text: String,
    pub button_url: String,
    pub app_id: String,
    pub activity_type: i64,
    pub status_display_type: i64,
}

#[derive(Default)]
struct DiscordInner {
    client: Option<DiscordIpcClient>,
    connected_app_id: String,
    active: bool,
    assets: DiscordAssets,
}

pub struct Discord {
    inner: Mutex<DiscordInner>,
}

impl Default for Discord {
    fn default() -> Self {
        Self::new()
    }
}

impl Discord {
    pub fn new() -> Self {
        Self {
            inner: Mutex::new(DiscordInner::default()),
        }
    }

    pub fn set_assets(&self, assets: DiscordAssets) {
        let mut inner = self.inner.lock();
        inner.assets = assets;
        if inner.active {
            Self::apply(&mut inner);
        }
    }

    pub fn set_active(&self, active: bool) -> bool {
        let mut inner = self.inner.lock();
        inner.active = active;
        if active {
            Self::apply(&mut inner);
        } else if let Some(mut client) = inner.client.take() {
            let _ = client.clear_activity();
            let _ = client.close();
            inner.connected_app_id.clear();
        }
        inner.active
    }

    fn ensure_client(inner: &mut DiscordInner) -> bool {
        let app_id = if inner.assets.app_id.is_empty() {
            "883308884863901717".to_string()
        } else {
            inner.assets.app_id.clone()
        };
        if inner.client.is_some() && inner.connected_app_id == app_id {
            return true;
        }
        if let Some(mut old) = inner.client.take() {
            let _ = old.close();
        }
        match DiscordIpcClient::new(&app_id) {
            Ok(mut client) => {
                if client.connect().is_ok() {
                    inner.client = Some(client);
                    inner.connected_app_id = app_id;
                    true
                } else {
                    false
                }
            }
            Err(_) => false,
        }
    }

    fn apply(inner: &mut DiscordInner) {
        if !Self::ensure_client(inner) {
            return;
        }
        let assets = inner.assets.clone();
        let Some(client) = inner.client.as_mut() else {
            return;
        };

        let mut activity = Activity::new();
        if !assets.details.is_empty() {
            activity = activity.details(&assets.details);
        }
        if !assets.state.is_empty() {
            activity = activity.state(&assets.state);
        }
        activity = activity.activity_type(match assets.activity_type {
            2 => ActivityType::Listening,
            3 => ActivityType::Watching,
            5 => ActivityType::Competing,
            _ => ActivityType::Playing,
        });

        let mut icons = Assets::new();
        if !assets.big_icon.is_empty() {
            icons = icons.large_image(&assets.big_icon);
        }
        if !assets.big_icon_text.is_empty() {
            icons = icons.large_text(&assets.big_icon_text);
        }
        if !assets.small_icon.is_empty() {
            icons = icons.small_image(&assets.small_icon);
        }
        if !assets.small_icon_text.is_empty() {
            icons = icons.small_text(&assets.small_icon_text);
        }
        activity = activity.assets(icons);

        let mut timestamps = Timestamps::new();
        if assets.start_time > 0 {
            timestamps = timestamps.start(assets.start_time);
        }
        if assets.end_time > 0 {
            timestamps = timestamps.end(assets.end_time);
        }
        activity = activity.timestamps(timestamps);

        if !assets.party_id.is_empty() {
            let mut party = Party::new().id(&assets.party_id);
            if assets.party_max_size > 0 {
                party = party.size([assets.party_size as i32, assets.party_max_size as i32]);
            }
            activity = activity.party(party);
        }

        let mut buttons = Vec::new();
        if !assets.button_text.is_empty() && !assets.button_url.is_empty() {
            buttons.push(Button::new(&assets.button_text, &assets.button_url));
        }
        if !buttons.is_empty() {
            activity = activity.buttons(buttons);
        }

        if client.set_activity(activity).is_err() {
            if let Some(mut old) = inner.client.take() {
                let _ = old.close();
            }
            inner.connected_app_id.clear();
        }
    }
}
